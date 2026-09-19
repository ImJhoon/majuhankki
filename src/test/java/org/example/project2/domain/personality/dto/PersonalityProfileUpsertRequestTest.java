package org.example.project2.domain.personality.dto;

import org.example.project2.domain.personality.entity.PersonalityAnswerValue;
import org.example.project2.domain.personality.entity.PersonalityDimension;
import org.example.project2.domain.personality.entity.PersonalityQuestionnaireVersion;
import org.example.project2.domain.personality.entity.PersonalityTag;
import org.example.project2.domain.personality.exception.InvalidPersonalityInputException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PersonalityProfileUpsertRequestTest {

    @Test
    void acceptsAllFourDimensionsOnce() {
        PersonalityProfileUpsertRequest request = request(List.of(
                answer(PersonalityDimension.CONVERSATION_LEVEL, PersonalityAnswerValue.LOW),
                answer(PersonalityDimension.MEAL_PACE, PersonalityAnswerValue.MEDIUM),
                answer(PersonalityDimension.PLANNING_STYLE, PersonalityAnswerValue.HIGH),
                answer(PersonalityDimension.NOVELTY_PREFERENCE, PersonalityAnswerValue.MEDIUM)
        ));

        assertThat(request.validatedAnswers())
                .containsOnlyKeys(PersonalityDimension.values());
    }

    @Test
    void acceptsConsentWithdrawalAndDiscardsSubmittedAiData() {
        PersonalityProfileUpsertRequest baseline = request(List.of(
                answer(PersonalityDimension.CONVERSATION_LEVEL, PersonalityAnswerValue.LOW),
                answer(PersonalityDimension.MEAL_PACE, PersonalityAnswerValue.MEDIUM),
                answer(PersonalityDimension.PLANNING_STYLE, PersonalityAnswerValue.HIGH),
                answer(PersonalityDimension.NOVELTY_PREFERENCE, PersonalityAnswerValue.MEDIUM)
        ));
        PersonalityProfileUpsertRequest withdrawn = new PersonalityProfileUpsertRequest(
                baseline.questionnaireVersion(), baseline.answers(), baseline.styleTags(),
                "이전 자기소개", false, List.of("이전 키워드")
        );

        assertThat(withdrawn.validatedAnswers()).hasSize(4);
        assertThat(withdrawn.selfDescription()).isNull();
        assertThat(withdrawn.aiKeywords()).isEmpty();
        try (var factory = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            assertThat(factory.getValidator().validate(withdrawn)).isEmpty();
        }

        PersonalityProfileUpsertRequest consentedWithoutKeywords = new PersonalityProfileUpsertRequest(
                baseline.questionnaireVersion(), baseline.answers(), baseline.styleTags(),
                "자기소개", true, List.of()
        );
        assertThatThrownBy(consentedWithoutKeywords::validatedAnswers)
                .isInstanceOf(InvalidPersonalityInputException.class)
                .hasMessage("AI 키워드 태그를 최소 1개 이상 추출해야 합니다.");
    }

    @Test
    void rejectsDuplicatedAndMissingDimension() {
        PersonalityProfileUpsertRequest request = request(List.of(
                answer(PersonalityDimension.CONVERSATION_LEVEL, PersonalityAnswerValue.LOW),
                answer(PersonalityDimension.CONVERSATION_LEVEL, PersonalityAnswerValue.HIGH),
                answer(PersonalityDimension.PLANNING_STYLE, PersonalityAnswerValue.HIGH),
                answer(PersonalityDimension.NOVELTY_PREFERENCE, PersonalityAnswerValue.MEDIUM)
        ));

        assertThatThrownBy(request::validatedAnswers)
                .isInstanceOf(InvalidPersonalityInputException.class)
                .hasMessage("같은 성향 차원을 중복 제출할 수 없습니다.");
    }

    @Test
    void rejectsMissingDimension() {
        PersonalityProfileUpsertRequest request = request(List.of(
                answer(PersonalityDimension.CONVERSATION_LEVEL, PersonalityAnswerValue.LOW),
                answer(PersonalityDimension.MEAL_PACE, PersonalityAnswerValue.MEDIUM),
                answer(PersonalityDimension.PLANNING_STYLE, PersonalityAnswerValue.HIGH)
        ));

        assertThatThrownBy(request::validatedAnswers)
                .isInstanceOf(InvalidPersonalityInputException.class)
                .hasMessage("네 가지 성향 차원에 모두 응답해야 합니다.");
    }

    @Test
    void rejectsUnsupportedQuestionnaireVersion() {
        PersonalityProfileUpsertRequest request = new PersonalityProfileUpsertRequest(
                null,
                List.of(
                        answer(PersonalityDimension.CONVERSATION_LEVEL, PersonalityAnswerValue.LOW),
                        answer(PersonalityDimension.MEAL_PACE, PersonalityAnswerValue.MEDIUM),
                        answer(PersonalityDimension.PLANNING_STYLE, PersonalityAnswerValue.HIGH),
                        answer(PersonalityDimension.NOVELTY_PREFERENCE, PersonalityAnswerValue.MEDIUM)
                ),
                Set.of(PersonalityTag.GOOD_LISTENER, PersonalityTag.FOOD_TALK, PersonalityTag.ENJOY_DESSERT),
                null,
                false,
                List.of("한식", "대화")
        );

        assertThatThrownBy(request::validatedAnswers)
                .isInstanceOf(InvalidPersonalityInputException.class)
                .hasMessage("지원하지 않는 설문 버전입니다.");
    }

    private PersonalityProfileUpsertRequest request(List<PersonalityAnswerRequest> answers) {
        return new PersonalityProfileUpsertRequest(
                PersonalityQuestionnaireVersion.MEAL_PERSONALITY_V1,
                answers,
                Set.of(PersonalityTag.GOOD_LISTENER, PersonalityTag.FOOD_TALK, PersonalityTag.ENJOY_DESSERT),
                null,
                false,
                List.of("한식", "대화")
        );
    }

    private PersonalityAnswerRequest answer(
            PersonalityDimension dimension,
            PersonalityAnswerValue value
    ) {
        return new PersonalityAnswerRequest(dimension, value);
    }
}
